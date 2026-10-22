/**
 * BallThrower — swipe/drag up to launch the ball toward the hoop.
 *
 * Pure kinematics (no physics engine needed): velocity + gravity integration.
 * A shot scores when the ball crosses the rim plane downward inside the rim radius.
 * All tunables are exposed as editor attributes.
 */
var BallThrower = pc.createScript('ballThrower');

// --- Inspector attributes ---------------------------------------------------
BallThrower.attributes.add('hoop', { type: 'entity', title: 'Hoop (rim center)' });
BallThrower.attributes.add('gravity', { type: 'number', default: 9.8 });
BallThrower.attributes.add('rimRadius', { type: 'number', default: 0.35 });
BallThrower.attributes.add('floorY', { type: 'number', default: 0.256, description: 'Ball center height when resting on the floor' });
BallThrower.attributes.add('minFlightTime', { type: 'number', default: 0.75 });
BallThrower.attributes.add('maxFlightTime', { type: 'number', default: 1.4 });
BallThrower.attributes.add('fullPowerSwipe', { type: 'number', default: 350, description: 'Swipe length in px for maximum power' });
BallThrower.attributes.add('lateralFactor', { type: 'number', default: 0.006, description: 'Horizontal offset per pixel of sideways drag' });
BallThrower.attributes.add('bounce', { type: 'number', default: 0.55 });
BallThrower.attributes.add('resetDelay', { type: 'number', default: 1.4 });
BallThrower.attributes.add('maxFlightDuration', { type: 'number', default: 4 });

// --- Runtime ----------------------------------------------------------------

BallThrower.prototype.initialize = function () {
    this.spawnPos = this.entity.getPosition().clone();
    this.velocity = new pc.Vec3();

    this.state = 'idle';        // idle | flying | resetting
    this.canThrow = false;      // enabled when gameplay starts
    this._dragStart = null;
    this._dragCur = null;
    this._timer = 0;
    this._prevPos = new pc.Vec3();
    this._target = new pc.Vec3();

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

    this.app.on('game:play', function () {
        self.canThrow = true;
        self.reset();
    });
    this.app.on('game:menu', function () {
        self.canThrow = false;
        self.reset();
    });
};

BallThrower.prototype._throw = function (start, end) {
    var dx = end.x - start.x;              // px, + = right
    var dy = start.y - end.y;              // px, + = swipe up
    if (dy < 30) return;                   // too small, ignore

    var power = pc.math.clamp(dy / this.fullPowerSwipe, 0.15, 1);
    var T = pc.math.lerp(this.minFlightTime, this.maxFlightTime, power);

    var hoop = this.hoop.getPosition();
    this._target.set(
        hoop.x - dx * this.lateralFactor,
        hoop.y,
        hoop.z
    );

    var pos = this.entity.getPosition();
    var g = this.gravity;
    this.velocity.set(
        (this._target.x - pos.x) / T,
        (this._target.y - pos.y) / T + 0.5 * g * T,
        (this._target.z - pos.z) / T
    );

    this._prevPos.copy(pos);
    this._timer = 0;
    this.state = 'flying';
    this.app.fire('ball:launch');
};

BallThrower.prototype.update = function (dt) {
    if (this.state === 'idle') return;

    var pos = this.entity.getPosition();
    this._timer += dt;

    if (this.state === 'flying') {
        // Integrate
        this.velocity.y -= this.gravity * dt;
        var nx = pos.x + this.velocity.x * dt;
        var ny = pos.y + this.velocity.y * dt;
        var nz = pos.z + this.velocity.z * dt;

        // Score check: crossing the rim plane downward inside the rim
        var hoop = this.hoop.getPosition();
        if (this.velocity.y < 0 && this._prevPos.y >= hoop.y && ny < hoop.y) {
            var dx = nx - hoop.x;
            var dz = nz - hoop.z;
            var dist = Math.sqrt(dx * dx + dz * dz);
            console.warn('[BT] cross dist='+dist.toFixed(3)+' y='+ny.toFixed(2)+' vel.y='+this.velocity.y.toFixed(2));
            if (dist < this.rimRadius) {
                var swish = dist < this.rimRadius * 0.55;
                this.app.fire('ball:score', swish ? 2 : 1);
                this.state = 'resetting';
                this._timer = 0;
            }
        }

        // Floor bounce
        if (ny < this.floorY && this.velocity.y < 0) {
            ny = this.floorY;
            this.velocity.y = -this.velocity.y * this.bounce;
            this.velocity.x *= 0.85;
            this.velocity.z *= 0.85;
            if (Math.abs(this.velocity.y) < 1.2) {
                this.state = 'resetting';
                this._timer = 0;
            }
        }

        if(this._timer%0.2<0.02)console.warn('[BT] pos '+nx.toFixed(2)+','+ny.toFixed(2)+','+nz.toFixed(2)+' hoop '+hoop.x.toFixed(2)+','+hoop.y.toFixed(2)+','+hoop.z.toFixed(2));
        this.entity.setPosition(nx, ny, nz);
        this._prevPos.set(nx, ny, nz);

        if (this._timer > this.maxFlightDuration) {
            this.state = 'resetting';
            this._timer = 0;
        }
    } else if (this.state === 'resetting' && this._timer >= this.resetDelay) {
        this.reset();
    }
};

BallThrower.prototype.reset = function () {
    this.entity.setPosition(this.spawnPos);
    this.velocity.set(0, 0, 0);
    this.state = 'idle';
    this._dragStart = null;
    this._timer = 0;
    this.app.fire('ball:reset');
};
