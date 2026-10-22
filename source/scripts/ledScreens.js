/**
 * LedScreens — flipbook animation for the LED ad screens.
 * Animates Mat_LED's UV offset through the frames of a sprite sheet
 * (grid of equal cells), like an animated GIF.
 *
 * If `atlas` is not set, does nothing (screens show the static map).
 * Frame order: left-to-right, top-to-bottom.
 */
var LedScreens = pc.createScript('ledScreens');

LedScreens.attributes.add('material', { type: 'asset', assetType: 'material', title: 'LED Material' });
LedScreens.attributes.add('atlas', { type: 'asset', assetType: 'texture', title: 'Sprite Sheet' });
LedScreens.attributes.add('columns', { type: 'number', default: 4, min: 1, title: 'Columns' });
LedScreens.attributes.add('rows', { type: 'number', default: 1, min: 1, title: 'Rows' });
LedScreens.attributes.add('fps', { type: 'number', default: 8, min: 0, title: 'Frames / sec' });

LedScreens.prototype.initialize = function () {
    this._t = 0;
    this._frame = -1;

    var atlasAsset = (typeof this.atlas === 'object') ? this.atlas : this.app.assets.get(this.atlas);
    if (this.material && atlasAsset) {
        var mat = this.material.resource;
        if (mat) {
            mat.emissiveMap = atlasAsset.resource;
            mat.diffuseMap = atlasAsset.resource;
            var sx = 1 / Math.max(1, this.columns);
            var sy = 1 / Math.max(1, this.rows);
            // keep the -1 flip baked into the screen UVs
            mat.emissiveMapTiling = mat.diffuseMapTiling = new pc.Vec2(-sx, -sy);
            mat.update();
        }
    }
};

LedScreens.prototype.update = function (dt) {
    var mat = this.material && this.material.resource;
    if (!mat || !this.atlas || this.fps <= 0) return;

    var cols = Math.max(1, this.columns), rows = Math.max(1, this.rows);
    var frame = Math.floor(this._t * this.fps) % (cols * rows);
    this._t += dt;
    if (frame === this._frame) return;
    this._frame = frame;

    var cx = frame % cols;
    var cy = Math.floor(frame / cols);
    var off = new pc.Vec2(1 - (cx + 1) / cols, 1 - (cy + 1) / rows);
    mat.emissiveMapOffset = mat.diffuseMapOffset = off;
    mat.update();
};
