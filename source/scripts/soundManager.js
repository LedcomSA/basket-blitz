/**
 * SoundManager — plays game SFX and music from the recovered original assets.
 * Slots are created on this entity's `sound` component and triggered by the
 * existing game events, so no other script needs to know about audio.
 *
 * Events listened: game:play, game:menu, ball:launch, ball:score,
 * ball:rim, ball:boardHit, ball:bounce, ball:reset
 */
var SoundManager = pc.createScript('soundManager');

SoundManager.attributes.add('throwSound', { type: 'asset', assetType: 'audio', title: 'Throw (launch)' });
SoundManager.attributes.add('swishSound', { type: 'asset', assetType: 'audio', title: 'Swish (perfect basket)' });
SoundManager.attributes.add('scoreSound', { type: 'asset', assetType: 'audio', title: 'Score' });
SoundManager.attributes.add('rimSound', { type: 'asset', assetType: 'audio', title: 'Rim / Backboard' });
SoundManager.attributes.add('bounceSound', { type: 'asset', assetType: 'audio', title: 'Court Bounce' });
SoundManager.attributes.add('playSound', { type: 'asset', assetType: 'audio', title: 'Play button / whistle' });
SoundManager.attributes.add('music', { type: 'asset', assetType: 'audio', title: 'Music (loops)' });
SoundManager.attributes.add('musicVolume', { type: 'number', default: 0.3, min: 0, max: 1 });
SoundManager.attributes.add('sfxVolume', { type: 'number', default: 1, min: 0, max: 1 });

SoundManager.prototype.initialize = function () {
    var snd = this.entity.sound;
    var self = this;

    function slot(name, assetRef, volume, loop) {
        if (!assetRef) return null;
        var asset = (typeof assetRef === 'object') ? assetRef : self.app.assets.get(assetRef);
        if (!asset) {
            console.warn('[SOUND] missing asset for slot "' + name + '" (id ' + assetRef + ')');
            return null;
        }
        var s = snd.slots[name];
        if (!s) s = snd.addSlot(name, { asset: asset.id });
        if (!s) return null;
        if (!s.asset) s.asset = asset;
        s.volume = volume;
        s.loop = loop;
        s.overlap = true;
        s.autoPlay = false;
        return s;
    }

    this._slots = {
        throw: slot('throw', this.throwSound, this.sfxVolume, false),
        swish: slot('swish', this.swishSound, this.sfxVolume, false),
        score: slot('score', this.scoreSound, this.sfxVolume, false),
        rim: slot('rim', this.rimSound, this.sfxVolume, false),
        bounce: slot('bounce', this.bounceSound, this.sfxVolume, false),
        play: slot('play', this.playSound, this.sfxVolume, false),
        music: slot('music', this.music, this.musicVolume, true)
    };

    function play(name) {
        var s = self._slots[name];
        if (s) {
            console.warn('[SOUND] play ' + name);
            s.play();
        } else {
            console.warn('[SOUND] no slot "' + name + '"');
        }
    }

    this.app.on('game:play', function () {
        play('play');
        if (self._slots.music && !self._slots.music.isPlaying) self._slots.music.play();
    });
    this.app.on('game:menu', function () {
        if (self._slots.music) self._slots.music.stop();
    });
    this.app.on('ball:launch', function () { play('throw'); });
    this.app.on('ball:score', function (points) {
        play(points === 2 ? 'swish' : 'score');
    });
    this.app.on('ball:rim', function () { play('rim'); });
    this.app.on('ball:boardHit', function () { play('rim'); });
    this.app.on('ball:bounce', function () { play('bounce'); });
};
