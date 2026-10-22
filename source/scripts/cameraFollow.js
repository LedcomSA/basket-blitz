/**
 * CameraFollow — original Basket Blitz camera behaviour.
 *
 * Idle: camera rig sits behind the spawn point, looking at the LookAt entity.
 * On 'ball:launch': the LookAt target chases the ball and the rig moves
 * halfway toward the ball (like the original onAirUpdate).
 * On 'ball:reset' / 'game:menu': rig and LookAt ease back home.
 * On 'ball:score': small downward kick.
 *
 * Attach to the camera RIG entity (GameCamera).
 */
var CameraFollow = pc.createScript('cameraFollow');

CameraFollow.attributes.add('camera', { type: 'entity', title: 'Camera entity' });
CameraFollow.attributes.add('lookAt', { type: 'entity', title: 'LookAt target' });
CameraFollow.attributes.add('ball', { type: 'entity', title: 'Ball entity' });
CameraFollow.attributes.add('lookSpeed', { type: 'number', default: 15, description: 'LookAt chase friction' });
CameraFollow.attributes.add('followSpeed', { type: 'number', default: 25, description: 'Rig chase friction' });
CameraFollow.attributes.add('followAmount', { type: 'number', default: 0.5, description: 'How far the rig follows the ball (0-1)' });
CameraFollow.attributes.add('lookAmount', { type: 'number', default: 0, description: 'How much the view turns toward the ball (0 = eyes on the basket, 1 = centered on the ball)' });
CameraFollow.attributes.add('returnDuration', { type: 'number', default: 0.6 });
CameraFollow.attributes.add('kickAmount', { type: 'number', default: 0.08 });

CameraFollow.prototype.initialize = function () {
    this.homePos = this.entity.getPosition().clone();
    this.homeLook = this.lookAt.getPosition().clone();
    this.baseHomePos = this.homePos.clone();
    this.baseHomeLook = this.homeLook.clone();

    this._mode = 'idle';           // idle | follow | return
    this._t = 0;
    this._retPos = new pc.Vec3();
    this._retLook = new pc.Vec3();
    this._kickY = 0;

    var self = this;
    this.app.on('ball:launch', function () { self._mode = 'follow'; });
    this.app.on('ball:reset', function () { self._goHome(); });
    this.app.on('game:menu', function () { self._goHome(); });
    this.app.on('ball:score', function () { self._kickY = -self.kickAmount; self._goHome(); });
    this.app.on('ball:rim', function () { if (self._mode === 'follow') self._goHome(); });
    this.app.on('ball:boardHit', function () { if (self._mode === 'follow') self._goHome(); });
    this.app.on('ball:bounce', function () { if (self._mode === 'follow') self._goHome(); });
    this.app.on('ball:spawn', function (e) { self._rotateHome(e.angle, e.pivot); });

    this._look();
};

CameraFollow.prototype._rotateHome = function (angle, pivot) {
    var rot = function (base, out) {
        var dx = base.x - pivot.x, dz = base.z - pivot.z;
        var c = Math.cos(angle), s = Math.sin(angle);
        out.set(pivot.x + dx * c - dz * s, base.y, pivot.z + dx * s + dz * c);
    };
    rot(this.baseHomePos, this.homePos);
    rot(this.baseHomeLook, this.homeLook);
    if (this._mode !== 'follow') {
        this._mode = 'idle';
        this.entity.setPosition(this.homePos);
        this.lookAt.setPosition(this.homeLook);
    }
};

CameraFollow.prototype._goHome = function () {
    this._mode = 'return';
    this._t = 0;
    this._retPos.copy(this.entity.getPosition());
    this._retLook.copy(this.lookAt.getPosition());
};

CameraFollow.prototype.postUpdate = function (dt) {
    var p = this.entity.getPosition();
    var l = this.lookAt.getPosition();
    var k;

    if (this._mode === 'follow') {
        var b = this.ball.getPosition();
        var f = Math.min(1, this.followSpeed * dt);
        var s = Math.min(1, this.lookSpeed * dt);

        // LookAt chases a point part-way between its home and the ball,
        // but never below its home height: the basket stays in frame
        var la = this.lookAmount, h = this.homeLook;
        l.x += (h.x + (b.x - h.x) * la - l.x) * s;
        var ly = h.y + Math.max(0, b.y - h.y) * la;
        l.y += (ly - l.y) * s;
        l.z += (h.z + (b.z - h.z) * la - l.z) * s;
        this.lookAt.setPosition(l);

        // Rig moves halfway toward the ball, keeping its home height offset
        var a = this.followAmount;
        p.x += (a * b.x - p.x) * f;
        p.y += (this.homePos.y + a * b.y - p.y) * f;
        p.z += (a * b.z - p.z) * f;
        this.entity.setPosition(p);
    } else if (this._mode === 'return') {
        this._t += dt;
        k = Math.min(1, this._t / this.returnDuration);
        k = 0.5 * (1 - Math.cos(Math.PI * k)); // sine in-out
        this.entity.setPosition(
            pc.math.lerp(this._retPos.x, this.homePos.x, k),
            pc.math.lerp(this._retPos.y, this.homePos.y, k),
            pc.math.lerp(this._retPos.z, this.homePos.z, k)
        );
        this.lookAt.setPosition(
            pc.math.lerp(this._retLook.x, this.homeLook.x, k),
            pc.math.lerp(this._retLook.y, this.homeLook.y, k),
            pc.math.lerp(this._retLook.z, this.homeLook.z, k)
        );
        if (k >= 1) this._mode = 'idle';
    }

    // Score kick (decaying offset on the camera)
    if (this._kickY !== 0) {
        this._kickY *= Math.pow(0.0001, dt); // fast decay
        if (Math.abs(this._kickY) < 0.001) this._kickY = 0;
    }

    this._look();
};

CameraFollow.prototype._look = function () {
    var target = this.lookAt.getPosition().clone();
    target.y += this._kickY;
    if (this.camera) this.camera.lookAt(target);
};
