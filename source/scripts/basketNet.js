/**
 * BasketNet — rope net simulated with Verlet integration (port of the
 * original FW_Physics net: 13 static rim nodes + 8 rings of 13 dynamic nodes,
 * diamond-pattern sticks rendered as thin cylinders).
 *
 * Attach to an entity placed at the original "Basket" pivot (rim center is
 * 0.73 m above it). The ball pushes the nodes, so the net swings when the
 * ball goes through it.
 */
var BasketNet = pc.createScript('basketNet');

BasketNet.attributes.add('ball', { type: 'entity', title: 'Ball' });
BasketNet.attributes.add('ballRadius', { type: 'number', default: 0.525 });
BasketNet.attributes.add('dragRange', { type: 'number', default: 0.1, description: 'Distance beyond the ball surface where ropes get dragged' });
BasketNet.attributes.add('dragAmount', { type: 'number', default: 0.2, description: 'Share of the ball velocity transferred to nearby ropes' });
BasketNet.attributes.add('material', { type: 'asset', assetType: 'material', title: 'Rope material' });
BasketNet.attributes.add('thickness', { type: 'number', default: 0.05 });
BasketNet.attributes.add('stiffness', { type: 'number', default: 0.4 });
BasketNet.attributes.add('gravity', { type: 'number', default: 10 });
BasketNet.attributes.add('damping', { type: 'number', default: 2.5, description: 'Velocity damping per second' });
BasketNet.attributes.add('heightScale', { type: 'number', default: 0.8, description: 'Vertical scale of the original node layout' });
BasketNet.attributes.add('ropeMargin', { type: 'number', default: 0.05, description: 'Extra gap kept between the ball surface and the ropes so they never show through the ball' });
BasketNet.attributes.add('iterations', { type: 'number', default: 3, description: 'Constraint passes per step (more = the ball opens the net more cleanly)' });

// Original node layout (local to the Basket pivot). Nodes 0-12 = rim (static).
BasketNet.NODES = [[0,0.913,0.924],[0.427,0.913,0.819],[0.788,0.913,0.483],[0.911,0.913,0],[0.858,0.913,-0.368],[0.609,0.913,-0.681],[0.22,0.913,-0.885],[-0.22,0.913,-0.885],[-0.609,0.913,-0.681],[-0.844,0.913,-0.382],[-0.911,0.913,0],[-0.792,0.913,0.473],[-0.427,0.913,0.819],[-0.202,0.661,0.765],[0.175,0.661,0.771],[0.529,0.661,0.603],[0.73,0.661,0.283],[0.769,0.661,-0.148],[0.65,0.661,-0.462],[0.362,0.661,-0.684],[-0.013,0.661,-0.8],[-0.381,0.661,-0.718],[-0.674,0.661,-0.458],[-0.804,0.661,-0.159],[-0.731,0.661,0.283],[-0.531,0.661,0.605],[-0.019,0.472,0.734],[0.326,0.472,0.627],[0.583,0.472,0.402],[0.697,0.472,0.091],[0.68,0.472,-0.252],[0.464,0.472,-0.542],[0.156,0.472,-0.705],[-0.181,0.472,-0.712],[-0.496,0.472,-0.544],[-0.688,0.472,-0.264],[-0.736,0.472,0.095],[-0.59,0.472,0.413],[-0.335,0.472,0.624],[0.151,0.236,0.617],[0.411,0.236,0.497],[0.589,0.236,0.229],[0.626,0.236,-0.077],[0.528,0.236,-0.382],[0.311,0.236,-0.587],[-0.016,0.236,-0.657],[-0.303,0.236,-0.59],[-0.549,0.236,-0.377],[-0.661,0.236,-0.074],[-0.62,0.236,0.22],[-0.449,0.236,0.483],[-0.157,0.236,0.617],[-0.008,-0.021,0.613],[0.266,-0.021,0.512],[0.499,-0.021,0.331],[0.589,-0.021,0.094],[0.552,-0.021,-0.22],[0.371,-0.021,-0.439],[0.142,-0.021,-0.586],[-0.161,-0.021,-0.567],[-0.397,-0.021,-0.442],[-0.559,-0.021,-0.206],[-0.588,-0.021,0.057],[-0.502,-0.021,0.351],[-0.283,-0.021,0.545],[0.119,-0.266,0.515],[0.346,-0.266,0.397],[0.488,-0.266,0.205],[0.522,-0.266,-0.071],[0.45,-0.266,-0.322],[0.261,-0.266,-0.492],[-0.018,-0.266,-0.538],[-0.251,-0.266,-0.494],[-0.462,-0.266,-0.313],[-0.554,-0.266,-0.071],[-0.525,-0.266,0.191],[-0.376,-0.266,0.404],[-0.129,-0.266,0.531],[-0.018,-0.508,0.531],[0.244,-0.508,0.441],[0.415,-0.508,0.28],[0.513,-0.508,0.05],[0.475,-0.508,-0.193],[0.332,-0.508,-0.394],[0.118,-0.508,-0.475],[-0.139,-0.508,-0.503],[-0.354,-0.508,-0.394],[-0.5,-0.508,-0.184],[-0.522,-0.508,0.051],[-0.426,-0.508,0.3],[-0.258,-0.508,0.466],[0.116,-0.714,0.477],[0.334,-0.714,0.382],[0.477,-0.714,0.165],[0.484,-0.714,-0.053],[0.4,-0.714,-0.289],[0.243,-0.714,-0.458],[-0.012,-0.714,-0.517],[-0.244,-0.714,-0.461],[-0.435,-0.714,-0.289],[-0.515,-0.714,-0.069],[-0.492,-0.714,0.192],[-0.337,-0.714,0.386],[-0.122,-0.714,0.477],[-0.014,-0.912,0.498],[0.224,-0.912,0.438],[0.402,-0.912,0.281],[0.483,-0.912,0.065],[0.473,-0.912,-0.173],[0.328,-0.912,-0.38],[0.113,-0.912,-0.492],[-0.126,-0.912,-0.506],[-0.349,-0.912,-0.389],[-0.494,-0.912,-0.181],[-0.499,-0.912,0.057],[-0.436,-0.912,0.298],[-0.248,-0.912,0.462]];

BasketNet.prototype.initialize = function () {
    var origin = this.entity.getPosition();
    var hs = this.heightScale;
    var self = this;

    this.nodes = BasketNet.NODES.map(function (p, i) {
        var pos = new pc.Vec3(origin.x + p[0], origin.y + p[1] * hs, origin.z + p[2]);
        return { pos: pos, old: pos.clone(), rest: pos.clone(), fixed: i < 13, radius: i < 13 ? 0.075 : 0.025 };
    });

    // Diamond sticks, same index pattern as the original
    this.sticks = [];
    var add = function (a, b) { self.sticks.push({ a: a, b: b, len: self.nodes[a].pos.distance(self.nodes[b].pos), render: null }); };
    var e, t;
    for (e = 0, t = 13; e < 12; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(25, 12); add(12, 13); add(13, 0);
    for (e = 14, t = 26; e < 26; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(38, 13); add(13, 26);
    for (e = 27, t = 39; e < 39; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(51, 26); add(26, 39);
    for (e = 39, t = 52; e < 51; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(64, 51); add(51, 52);
    for (e = 53, t = 65; e < 65; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(77, 52); add(52, 65);
    for (e = 65, t = 78; e < 77; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(90, 77); add(77, 78);
    for (e = 79, t = 91; e < 91; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(103, 78); add(78, 91);
    for (e = 91, t = 104; e < 103; ++t, ++e) { add(t, e); add(e, t + 1); }
    add(116, 103); add(103, 104);

    // Render each stick as a thin cylinder (world space, so no parent transform)
    var mat = this.material && this.material.resource;
    this.ropes = new pc.Entity('NetRopes');
    this.app.root.addChild(this.ropes);
    this.sticks.forEach(function (s) {
        var r = new pc.Entity('Rope');
        r.addComponent('render', { type: 'cylinder', castShadows: false, material: mat || undefined });
        self.ropes.addChild(r);
        s.render = r;
    });

    this._acc = 0;
    this._tmp = new pc.Vec3();
    this._mid = new pc.Vec3();
    this._ballVel = new pc.Vec3();
    this._ballPrev = this.ball ? this.ball.getPosition().clone() : new pc.Vec3();
    this._updateRender();

    this.on('destroy', function () { self.ropes.destroy(); });
};

BasketNet.prototype._step = function (dt) {
    var g = this.gravity * dt * dt;
    var keep = Math.max(0, 1 - this.damping * dt);
    var i, n, tmp = this._tmp;

    // Verlet integrate
    for (i = 0; i < this.nodes.length; i++) {
        n = this.nodes[i];
        if (n.fixed) continue;
        tmp.copy(n.pos);
        n.pos.x += (n.pos.x - n.old.x) * keep;
        n.pos.y += (n.pos.y - n.old.y) * keep - g;
        n.pos.z += (n.pos.z - n.old.z) * keep;
        n.old.copy(tmp);
    }

    // Ball drags nearby ropes along its motion
    var b = null;
    if (this.ball) {
        b = this.ball.getPosition();
        var bv = this._ballVel.sub2(b, this._ballPrev);
        if (bv.lengthSq() > 1) bv.set(0, 0, 0); // teleport (reset), ignore
        this._ballPrev.copy(b);
        // Only a falling ball interacts (a ball bouncing back up under the hoop passes freely)
        if (bv.y < 0) {
            for (i = 0; i < this.nodes.length; i++) {
                n = this.nodes[i];
                if (n.fixed) continue;
                var R = this.ballRadius + n.radius;
                var dy = n.pos.y - b.y;
                if (Math.abs(dy) >= R + this.dragRange) continue;
                tmp.set(n.pos.x - b.x, 0, n.pos.z - b.z);
                var d = tmp.length();
                var rAtY = Math.sqrt(Math.max(0, R * R - dy * dy));
                if (d < rAtY + this.dragRange) {
                    var k = this.dragAmount * (1 - Math.max(0, d - rAtY) / this.dragRange);
                    n.old.sub(this._mid.set(bv.x * k, bv.y * k * 0.3, bv.z * k));
                }
            }
        } else {
            b = null;
        }
    }

    // Stick constraints, then the ball pushes ropes out of its volume.
    // The push runs after each pass so the ball always wins over the ropes.
    for (var it = 0; it < this.iterations; it++) {
        for (i = 0; i < this.sticks.length; i++) {
            var s = this.sticks[i];
            var A = this.nodes[s.a], B = this.nodes[s.b];
            tmp.sub2(A.pos, B.pos);
            var len = tmp.length();
            if (len < 1e-6) continue;
            var diff = (len - s.len) / len * this.stiffness;
            var wa = A.fixed ? 0 : (B.fixed ? 1 : 0.5);
            var wb = B.fixed ? 0 : (A.fixed ? 1 : 0.5);
            if (wa) A.pos.sub(this._mid.copy(tmp).mulScalar(diff * wa));
            if (wb) B.pos.add(this._mid.copy(tmp).mulScalar(diff * wb));
        }
        if (b) this._pushOut(b);
    }
};

// Push rope nodes radially out of the ball (plus a margin covering the sag of
// the rope segment between two pushed nodes), never downward
BasketNet.prototype._pushOut = function (b) {
    var tmp = this._tmp;
    for (var i = 0; i < this.nodes.length; i++) {
        var n = this.nodes[i];
        if (n.fixed) continue;
        var R = this.ballRadius + n.radius + this.ropeMargin;
        var dy = n.pos.y - b.y;
        if (Math.abs(dy) >= R) continue;
        tmp.set(n.pos.x - b.x, 0, n.pos.z - b.z);
        var d = tmp.length();
        var rAtY = Math.sqrt(R * R - dy * dy);
        if (d < rAtY && d > 1e-5) n.pos.add(tmp.mulScalar((rAtY - d) / d));
    }
};

BasketNet.prototype._updateRender = function () {
    var th = this.thickness;
    for (var i = 0; i < this.sticks.length; i++) {
        var s = this.sticks[i];
        var a = this.nodes[s.a].pos, b = this.nodes[s.b].pos;
        this._mid.lerp(a, b, 0.5);
        s.render.setPosition(this._mid);
        s.render.lookAt(a);
        s.render.rotateLocal(90, 0, 0);
        s.render.setLocalScale(th, a.distance(b), th);
    }
};

BasketNet.prototype.update = function (dt) {
    var step = 1 / 60;
    this._acc = Math.min(this._acc + dt, 0.1);
    while (this._acc >= step) {
        this._step(step);
        this._acc -= step;
    }
    this._updateRender();
};
